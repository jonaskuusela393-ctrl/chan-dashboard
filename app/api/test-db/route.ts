import sql from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`SELECT NOW()`;

    return Response.json({
      success: true,
      time: result[0],
    });
  } catch (err: any) {
    return Response.json({
      success: false,
      error: err.message,
    });
  }
}