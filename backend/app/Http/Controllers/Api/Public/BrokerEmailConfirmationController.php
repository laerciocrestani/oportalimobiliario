<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Services\BrokerEmailConfirmationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BrokerEmailConfirmationController extends Controller
{
    public function __construct(private BrokerEmailConfirmationService $confirmations) {}

    public function confirm(Request $request): RedirectResponse
    {
        return $this->confirmations->confirm($request);
    }
}
