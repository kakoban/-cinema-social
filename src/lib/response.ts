import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ success: false, error: msg }, { status: 401 });
}

export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ success: false, error: msg }, { status: 403 });
}

export function notFound(msg = "Not found") {
  return NextResponse.json({ success: false, error: msg }, { status: 404 });
}
