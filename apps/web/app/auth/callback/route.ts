import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function loginRedirect(
  origin: string,
  params: Record<string, string | null | undefined>,
) {
  const url = new URL("/login", origin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  let next = searchParams.get("next") ?? "/dashboard";

  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (oauthError || errorCode) {
    return loginRedirect(origin, {
      error: oauthError ?? "invalid_request",
      error_code: errorCode ?? "oauth_error",
      error_description: searchParams.get("error_description"),
    });
  }

  if (!code) {
    return loginRedirect(origin, {
      error: "auth_callback_failed",
      error_code: "missing_code",
      error_description: "Authorization code was not returned",
    });
  }

  const redirectUrl = `${origin}${next}`;
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginRedirect(origin, {
      error: "auth_callback_failed",
      error_code: error.code ?? "exchange_failed",
      error_description: error.message,
    });
  }

  return response;
}
