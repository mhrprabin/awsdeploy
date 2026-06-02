<?php

use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::apiResource('payments', PaymentController::class)->except(['update']);
Route::patch('payments/{payment}/status', [PaymentController::class, 'updateStatus']);
Route::post('payments/{payment}/refund',  [PaymentController::class, 'refund']);
Route::get('payments/order/{orderId}',    [PaymentController::class, 'byOrder']);
