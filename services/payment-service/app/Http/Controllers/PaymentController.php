<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentRequest;
use App\Models\Payment;
use App\Services\KafkaProducer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    private function verifyOrder(int $orderId, int $userId): array|null
    {
        try {
            $orderUrl = env('ORDER_SERVICE_URL', 'http://order-service:3002');
            $response = Http::timeout(5)->get("{$orderUrl}/internal/orders/{$orderId}");

            if (!$response->successful()) return null;

            $order = $response->json();
            if ((int) $order['user_id'] !== $userId) return null;

            return $order;
        } catch (\Throwable $e) {
            Log::warning("[PaymentService] Could not verify order #{$orderId}: " . $e->getMessage());
            return null;
        }
    }

    /** Sum all completed payments for an order to get total already paid */
    private function totalPaidForOrder(int $orderId): float
    {
        return (float) Payment::where('order_id', $orderId)
            ->where('status', 'completed')
            ->sum('amount');
    }

    public function index(): JsonResponse
    {
        $payments = Payment::latest()->get();
        return response()->json(['payments' => $payments, 'total' => $payments->count()]);
    }

    public function store(PaymentRequest $request): JsonResponse
    {
        $userId  = (int) $request->header('X-User-Id');
        $orderId = (int) $request->validated()['order_id'];

        if (!$userId) {
            return response()->json(['error' => 'User identity missing from gateway headers'], 401);
        }

        // Verify order exists and belongs to this user
        $order = $this->verifyOrder($orderId, $userId);
        if (!$order) {
            return response()->json(['error' => "Order #{$orderId} not found or does not belong to you"], 404);
        }

        // Calculate how much is still owed
        $orderTotal       = (float) $order['total_price'];
        $alreadyPaid      = $this->totalPaidForOrder($orderId);
        $remainingBalance = round($orderTotal - $alreadyPaid, 2);

        if ($remainingBalance <= 0) {
            return response()->json([
                'error'          => "Order #{$orderId} is already fully paid",
                'order_total'    => $orderTotal,
                'total_paid'     => $alreadyPaid,
            ], 409);
        }

        // Amount defaults to full remaining balance; validate it doesn't exceed it
        $amount = isset($request->validated()['amount'])
            ? round((float) $request->validated()['amount'], 2)
            : $remainingBalance;

        if ($amount > $remainingBalance) {
            return response()->json([
                'error'             => "Payment amount exceeds remaining balance",
                'remaining_balance' => $remainingBalance,
                'requested_amount'  => $amount,
            ], 422);
        }

        $payment = Payment::create([
            'order_id'        => $orderId,
            'user_id'         => $userId,
            'amount'          => $amount,
            'currency'        => $request->validated()['currency'] ?? 'USD',
            'method'          => $request->validated()['method']   ?? 'card',
            'transaction_ref' => 'TXN-' . strtoupper(Str::random(16)),
            'status'          => 'pending',
            'notes'           => $request->validated()['notes'] ?? null,
        ]);

        KafkaProducer::publish('payment.created', [
            'userId'           => $userId,
            'paymentId'        => $payment->id,
            'orderId'          => $orderId,
            'amount'           => $amount,
            'currency'         => $payment->currency,
            'method'           => $payment->method,
            'orderTotal'       => $orderTotal,
            'alreadyPaid'      => $alreadyPaid,
            'remainingBalance' => round($remainingBalance - $amount, 2),
        ]);

        return response()->json(array_merge($payment->toArray(), [
            'order_total'       => $orderTotal,
            'already_paid'      => $alreadyPaid,
            'remaining_balance' => round($remainingBalance - $amount, 2),
        ]), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json($payment);
    }

    public function destroy(Payment $payment): JsonResponse
    {
        $payment->delete();
        return response()->json(['message' => 'Payment deleted', 'id' => $payment->id]);
    }

    public function updateStatus(Request $request, Payment $payment): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,processing,completed,failed,refunded',
        ]);

        $payment->update([
            'status'  => $request->status,
            'paid_at' => $request->status === 'completed' ? now() : null,
        ]);

        if (in_array($request->status, ['completed', 'failed', 'refunded'])) {
            $orderTotal  = 0;
            $totalPaid   = $this->totalPaidForOrder($payment->order_id);
            $order       = $this->verifyOrder($payment->order_id, $payment->user_id);
            if ($order) $orderTotal = (float) $order['total_price'];

            $remaining   = max(0, round($orderTotal - $totalPaid, 2));
            $isFullyPaid = $request->status === 'completed' && $remaining <= 0;

            $eventMap = [
                'completed' => $isFullyPaid ? 'payment.completed' : 'payment.partial',
                'failed'    => 'payment.failed',
                'refunded'  => 'payment.refunded',
            ];

            KafkaProducer::publish($eventMap[$request->status], [
                'userId'           => $payment->user_id,
                'paymentId'        => $payment->id,
                'orderId'          => $payment->order_id,
                'amount'           => (float) $payment->amount,
                'currency'         => $payment->currency,
                'orderTotal'       => $orderTotal,
                'totalPaid'        => $totalPaid,
                'remainingBalance' => $remaining,
                'isFullyPaid'      => $isFullyPaid,
            ]);
        }

        return response()->json($payment);
    }

    public function refund(Payment $payment): JsonResponse
    {
        if ($payment->status !== 'completed') {
            return response()->json(['error' => 'Only completed payments can be refunded'], 422);
        }

        $payment->update(['status' => 'refunded']);

        KafkaProducer::publish('payment.refunded', [
            'userId'    => $payment->user_id,
            'paymentId' => $payment->id,
            'orderId'   => $payment->order_id,
            'amount'    => (float) $payment->amount,
        ]);

        return response()->json($payment);
    }

    public function byOrder(int $orderId): JsonResponse
    {
        $payments = Payment::where('order_id', $orderId)->latest()->get();
        $total    = $payments->where('status', 'completed')->sum('amount');

        return response()->json([
            'payments'    => $payments,
            'total'       => $payments->count(),
            'total_paid'  => (float) $total,
        ]);
    }
}
