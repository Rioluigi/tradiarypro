import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-level client to bypass RLS for webhook inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WebhookBody {
  user_id: string;
  account_id?: string;
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission: number;
}

const REQUIRED_FIELDS: (keyof Omit<WebhookBody, 'account_id'>)[] = [
  'user_id',
  'ticket',
  'symbol',
  'type',
  'volume',
  'open_price',
  'close_price',
  'open_time',
  'close_time',
  'profit',
  'commission',
];

function validatePayload(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: WebhookBody;
} {
  // Check for missing required fields
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Validate type field
  const tradeType = String(body.type).toUpperCase();
  if (tradeType !== 'BUY' && tradeType !== 'SELL') {
    return {
      valid: false,
      error: 'Invalid data format: type must be "BUY" or "SELL"',
    };
  }

  // Validate numeric fields
  const numericFields: (keyof Omit<WebhookBody, 'account_id'>)[] = [
    'ticket',
    'volume',
    'open_price',
    'close_price',
    'profit',
    'commission',
  ];

  for (const field of numericFields) {
    const value = body[field];
    if (typeof value !== 'number' || isNaN(value as number)) {
      return {
        valid: false,
        error: `Invalid data format: ${field} must be a valid number`,
      };
    }
  }

  // Validate timestamps
  const openTime = new Date(body.open_time as string);
  const closeTime = new Date(body.close_time as string);

  if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
    return {
      valid: false,
      error: 'Invalid data format: open_time and close_time must be valid ISO timestamps',
    };
  }

  if (closeTime.getTime() <= openTime.getTime()) {
    return {
      valid: false,
      error: 'Invalid data format: close_time must be greater than open_time',
    };
  }

  // Validate user_id is a valid UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(String(body.user_id))) {
    return {
      valid: false,
      error: 'Invalid data format: user_id must be a valid UUID',
    };
  }

  // Validate account_id is a valid UUID format if provided
  if (body.account_id !== undefined && body.account_id !== null && body.account_id !== '') {
    if (!uuidRegex.test(String(body.account_id))) {
      return {
        valid: false,
        error: 'Invalid data format: account_id must be a valid UUID',
      };
    }
  }

  return {
    valid: true,
    data: {
      user_id: String(body.user_id),
      ...(body.account_id && body.account_id !== '' ? { account_id: String(body.account_id) } : {}),
      ticket: Number(body.ticket),
      symbol: String(body.symbol),
      type: tradeType,
      volume: Number(body.volume),
      open_price: Number(body.open_price),
      close_price: Number(body.close_price),
      open_time: openTime.toISOString(),
      close_time: closeTime.toISOString(),
      profit: Number(body.profit),
      commission: Number(body.commission),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;

    try {
      body = await request.json();
      console.log('Webhook POST received payload:', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error('Failed to parse webhook JSON body:', err);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate the payload
    const validation = validatePayload(body);
    console.log('Webhook validation result:', validation);

    if (!validation.valid) {
      console.warn('Webhook payload validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const tradeData = validation.data!;
    console.log('Attempting to insert trade data into Supabase:', JSON.stringify(tradeData, null, 2));

    // Insert trade into the database
    const { data, error } = await supabaseAdmin
      .from('trades')
      .insert([tradeData])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log('Successfully inserted trade. Generated ID:', data.id);
    return NextResponse.json(
      { success: true, id: data.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Health check for GET
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Tradiary Webhook',
    method: 'POST',
    description: 'Send trade data from MetaTrader 5 to this endpoint',
  });
}
