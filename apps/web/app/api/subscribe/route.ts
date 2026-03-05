import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const LEMON_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LEMON_VARIANT_ID = process.env.LEMON_SQUEEZY_VARIANT_ID;

const LEMON_API = 'https://api.lemonsqueezy.com/v1';

async function getStore(): Promise<{ storeId: string; storeBaseUrl: string }> {
  const res = await fetch(`${LEMON_API}/stores`, {
    headers: {
      Authorization: `Bearer ${LEMON_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy stores API failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ id: string; attributes?: { slug?: string; url?: string; domain?: string } }>;
  };
  const stores = json.data ?? [];
  const store =
    stores.find((s) => s.attributes?.slug === 'alex-pan007') ?? stores[0];
  if (!store?.id) throw new Error('No store found in Lemon Squeezy');
  const storeBaseUrl =
    store.attributes?.url ??
    (store.attributes?.domain ? `https://${store.attributes.domain}` : 'https://app.lemonsqueezy.com');
  return { storeId: store.id, storeBaseUrl: storeBaseUrl.replace(/\/$/, '') };
}

interface CheckoutResponse {
  data: {
    attributes: {
      url: string;
    };
  };
}

async function createCheckout(
  storeId: string,
  storeBaseUrl: string,
  clerkId: string,
): Promise<CheckoutResponse> {
  const res = await fetch(`${LEMON_API}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LEMON_API_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: {
              clerkId,
            },
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: storeId },
          },
          variant: {
            data: { type: 'variants', id: LEMON_VARIANT_ID },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout API failed: ${res.status} ${text}`);
  }
  const checkout = (await res.json()) as CheckoutResponse;
  console.log(JSON.stringify(checkout.data, null, 2));

  const url = checkout.data.attributes.url;
  if (!url) throw new Error('No checkout URL in Lemon Squeezy response');

  if (!url.startsWith('http')) {
    const base = storeBaseUrl.replace(/\/$/, '');
    checkout.data.attributes.url = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }

  return checkout;
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  if (!LEMON_API_KEY || !LEMON_VARIANT_ID) {
    return NextResponse.json(
      { error: '未配置 LEMON_SQUEEZY_API_KEY 或 LEMON_SQUEEZY_VARIANT_ID' },
      { status: 500 }
    );
  }

  try {
    const { storeId, storeBaseUrl } = await getStore();
    const checkout = await createCheckout(storeId, storeBaseUrl, userId);
    return NextResponse.json({ url: checkout.data.attributes.url });
  } catch (err) {
    console.error('Subscribe checkout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '创建 Checkout 失败' },
      { status: 500 }
    );
  }
}
