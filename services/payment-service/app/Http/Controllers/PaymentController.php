<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentRequest;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function index(): JsonResponse
    {
        $payments = Payment::latest()->get();

        return response()->json([
            'payments' => $payments,
            'total'    => $payments->count(),
        ]);
    }

    public function store(PaymentRequest $request): JsonResponse
    {
        $payment = Payment::create([
            ...$request->validated(),
            'transaction_ref' => 'TXN-' . strtoupper(Str::random(16)),
            'status'          => 'pending',
            'currency'        => $request->currency ?? 'USD',
            'method'          => $request->method   ?? 'card',
        ]);

        return response()->json($payment, 201);
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

        return response()->json($payment);
    }

    public function refund(Payment $payment): JsonResponse
    {
        if ($payment->status !== 'completed') {
            return response()->json(
                ['error' => 'Only completed payments can be refunded'],
                422
            );
        }

        $payment->update(['status' => 'refunded']);

        return response()->json($payment);
    }

    public function byOrder(int $orderId): JsonResponse
    {
        $payments = Payment::where('order_id', $orderId)->latest()->get();

        return response()->json([
            'payments' => $payments,
            'total'    => $payments->count(),
        ]);
    }
}
