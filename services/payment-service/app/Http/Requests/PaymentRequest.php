<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_id' => 'required|integer',
            // user_id is NOT required — taken from X-User-Id gateway header
            'amount'   => 'nullable|numeric|min:0.01',  // optional: falls back to order total
            'currency' => 'nullable|string|size:3',
            'method'   => 'nullable|in:card,bank_transfer,wallet,cash',
            'notes'    => 'nullable|string',
        ];
    }
}
