export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    // เสิร์ฟหน้าเว็บและไฟล์ประกอบจากตำแหน่งเดิม
    if (requestUrl.pathname !== "/api") {
      return env.ASSETS.fetch(request);
    }

    const errorResponse = (status, message) =>
      Response.json(
        { status: "error", message },
        { status, headers: { "Cache-Control": "no-store" } }
      );

    if (request.method !== "GET" && request.method !== "POST") {
      return errorResponse(405, "รองรับเฉพาะ GET และ POST");
    }

    if (!env.GAS_URL) {
      return errorResponse(500, "ยังไม่ได้ตั้งค่า GAS_URL บน Worker");
    }

    try {
      const gasUrl = new URL(env.GAS_URL);

      // ส่ง ?id=... ไปยัง GAS สำหรับคำขอตรวจลิงก์
      for (const [key, value] of requestUrl.searchParams) {
        gasUrl.searchParams.append(key, value);
      }

      const options = {
        method: request.method,
        redirect: "follow"
      };

      if (request.method === "POST") {
        const contentType = request.headers.get("Content-Type");

        if (contentType) {
            options.headers = { "Content-Type": contentType };
        }

        // อ่าน body เป็น bytes ก่อนส่ง เพื่อให้ fetch ส่งซ้ำได้หาก redirect ต้องใช้ body เดิม
        options.body = await request.arrayBuffer();
      }

      const response = await fetch(gasUrl, options);
      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok || !contentType.includes("application/json")) {
        return errorResponse(502, "GAS ไม่ได้ส่งผลตอบกลับเป็น JSON ที่ใช้งานได้");
      }

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store"
        }
      });
    } catch (err) {
    const detail = String(err?.message ?? err)
        .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
        .replace(/token-[A-Za-z0-9_-]+/gi, "[TOKEN]");

    console.error("GAS proxy failed", request.method, err?.name, detail);
    return errorResponse(502, "Worker ติดต่อ GAS ไม่สำเร็จ");
    }
  }
};