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
        const form = await request.formData();
        const action = form.get("action");
        const data = form.get("data");

        if (typeof action !== "string" || typeof data !== "string") {
            return errorResponse(400, "POST ต้องมีช่อง action และ data");
        }

        options.headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        };
        options.body = new URLSearchParams({ action, data }).toString();
    }

    const response = await fetch(gasUrl, options);
    const contentType = response.headers.get("Content-Type") || "";

    if (!response.ok || !/^application\/json\b/i.test(contentType)) {
        const mimeType = contentType.split(";")[0] || "unknown";

        console.warn("GAS response rejected", {
            method: request.method,
            upstreamStatus: response.status,
            mimeType,
            redirected: response.redirected
        });

        return errorResponse(
            502,
            `GAS ตอบ HTTP ${response.status}, Content-Type: ${mimeType}`
        );
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