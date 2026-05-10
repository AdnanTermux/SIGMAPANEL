"""SMS Webhook - Public endpoint for receiving SMS from external providers"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sms_processor import process_incoming_sms

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/sms")
async def webhook_sms(request: Request):
    try:
        content_type = request.headers.get('content-type', '')
        
        if 'application/json' in content_type:
            try:
                payload = await request.json()
            except Exception:
                text = await request.text()
                try:
                    import json
                    payload = json.loads(text)
                except Exception:
                    raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
        elif 'application/x-www-form-urlencoded' in content_type or 'multipart/form-data' in content_type:
            form = await request.form()
            payload = dict(form)
        
        elif 'text/' in content_type:
            text = await request.text()
            try:
                import json
                payload = json.loads(text)
            except Exception:
                payload = {"message": text}
        
        else:
            try:
                payload = await request.json()
            except Exception:
                text = await request.text()
                try:
                    import json
                    payload = json.loads(text)
                except Exception:
                    payload = {"message": text}
        
        result = process_incoming_sms(payload)
        
        if isinstance(result, list):
            success_count = sum(1 for r in result if r.get('success'))
            fail_count = len(result) - success_count
            return JSONResponse(content={
                "success": True,
                "message": f"Processed {len(result)} SMS: {success_count} successful, {fail_count} failed",
                "results": result,
            })
        
        if result.get('success'):
            return JSONResponse(content={
                "success": True,
                "message": "SMS received and processed",
                "sms": {
                    "id": result.get('smsId'),
                    "number": result.get('number'),
                    "service": result.get('service'),
                    "otp": result.get('otp'),
                    "country": result.get('country'),
                },
            })
        
        raise HTTPException(status_code=400, detail=result.get('error', 'Failed to process SMS'))
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error processing SMS")

@router.get("/sms")
async def webhook_health():
    return {
        "status": "ok",
        "service": "SIGMAPANEL SMS Webhook",
        "version": "2.0",
        "supportedFormats": [
            "standard_json", "array", "aadata_datatables",
            "nested_data", "provider_sms", "form_encoded",
        ],
    }
