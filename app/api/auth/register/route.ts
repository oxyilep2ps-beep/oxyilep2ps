import { NextResponse } from 'next/server';
import { runRegisterWithDocs } from '@/lib/auth/register-with-docs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Allow longer KYC video uploads on supported hosts. */
export const maxDuration = 60;

/**
 * Multipart registration endpoint — preferred over Server Actions for file uploads.
 * Always returns JSON so the client can show the real error string.
 */
export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('🚨 SERVER ACTION CRASHED (formData parse):', parseError);
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not read uploaded files. Please upload documents under 10MB each.',
        },
        { status: 413 }
      );
    }

    const result = await runRegisterWithDocs(formData);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error: unknown) {
    console.error('🚨 VERCEL SERVER ACTION CRASH:', error);
    const exactReason =
      error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { success: false, error: `Upload Failed: ${exactReason || 'Unknown internal server error'}` },
      { status: 500 }
    );
  }
}
