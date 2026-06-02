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
            'user_id'  => 'required|integer',
            'amount'   => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'method'   => 'nullable|in:card,bank_transfer,wallet,cash',
            'notes'    => 'nullable|string',
        ];
    }
}
