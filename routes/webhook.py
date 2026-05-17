"""SMS Webhook - clean POST/GET endpoint for REVE SMS HTTP API format"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sms_processor import process_incoming_sms

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/sms")
async def webhook_sms(request: Request):
    try:
        ct = request.headers.get("content-type", "")
        if "application/json" in ct:
            try: payload = await request.json()
            except Exception: raise HTTPException(400, "Invalid JSON payload")
        elif "application/x-www-form-urlencoded" in ct or "multipart" in ct:
            form = await request.form()
            payload = dict(form)
        else:
            try: payload = await request.json()
            except Exception:
                text = await request.body()
                try:
                    import json; payload = json.loads(text)
                except Exception: raise HTTPException(400, "Unsupported content type")

        result = process_incoming_sms(payload)

        if isinstance(result, list):
            ok = sum(1 for r in result if r.get("success"))
            return JSONResponse(content={"status": "ok", "processed": len(result), "success": ok, "failed": len(result)-ok})

        if result.get("success"):
            return JSONResponse(content={
                "status": "ok",
                "smsId": result.get("smsId"),
                "number": result.get("number"),
                "otp": result.get("otp"),
                "service": result.get("service"),
            })

        raise HTTPException(400, result.get("error", "Failed to process SMS"))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Internal server error")

@router.get("/sms")
async def webhook_health():
    return {"status": "ok"}
