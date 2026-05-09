import { NextResponse } from 'next/server';
import { processIncomingSms } from '@/lib/sms-processor';

/**
 * Webhook endpoint for receiving SMS from external providers
 * NO AUTHENTICATION REQUIRED - this is a public webhook
 * Supports multiple content types and formats
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: unknown;

    // Handle different content types
    if (contentType.includes('application/json')) {
      try {
        payload = await request.json();
      } catch {
        // Try reading as text and parsing
        const text = await request.text();
        try {
          payload = JSON.parse(text);
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON payload' },
            { status: 400 }
          );
        }
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      // Form-encoded: parse into object
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries());
    } else if (contentType.includes('text/plain') || contentType.includes('text/')) {
      // Try to parse as JSON first, then treat as raw text
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        // If not JSON, wrap in a simple object
        payload = { message: text };
      }
    } else {
      // Unknown content type - try JSON first, then text
      try {
        const clonedRequest = request.clone();
        payload = await clonedRequest.json();
      } catch {
        const text = await request.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { message: text };
        }
      }
    }

    // Process the SMS
    const result = await processIncomingSms(payload);

    // Handle single result vs array of results
    if (Array.isArray(result)) {
      const successCount = result.filter((r) => r.success).length;
      const failCount = result.length - successCount;

      return NextResponse.json({
        success: true,
        message: `Processed ${result.length} SMS: ${successCount} successful, ${failCount} failed`,
        results: result,
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS received and processed',
        sms: {
          id: result.smsId,
          number: result.number,
          service: result.service,
          otp: result.otp,
          country: result.country,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to process SMS',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Webhook SMS error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing SMS' },
      { status: 500 }
    );
  }
}

// Optional: GET handler for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'SIGMAPANEL SMS Webhook',
    version: '2.0',
    supportedFormats: [
      'standard_json',
      'array',
      'aadata_datatables',
      'nested_data',
      'provider_sms',
      'form_encoded',
    ],
  });
}
