<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch');

        return [
            'name'        => $isUpdate ? 'sometimes|string|max:200' : 'required|string|max:200',
            'description' => 'nullable|string',
            'price'       => $isUpdate ? 'sometimes|numeric|min:0' : 'required|numeric|min:0',
            'stock'       => 'nullable|integer|min:0',
            'category'    => 'nullable|string|max:100',
            'image_url'   => 'nullable|url|max:500',
        ];
    }
}
