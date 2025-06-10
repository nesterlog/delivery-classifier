from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
from services.dawn_service import apply_dawn_option
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/apply")
async def apply_dawn(
    template_file: UploadFile = File(...),
    request_type: str = Form(...),
    msg_type: str = Form(...),
    cycle: int = Form(...)
):
    """
    새벽옵션추가 실행 엔드포인트:
    - template_file: 새벽배송 양식 엑셀(.xlsx/.xls/.csv)
    - request_type: 배송대행 등
    - msg_type: 즉시전송/7시전송
    - cycle: 차수 (정수)
    """
    tmp_dir = "backend/tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    tpl_path = os.path.join(tmp_dir, template_file.filename)
    with open(tpl_path, "wb+") as buf:
        buf.write(await template_file.read())

    try:
        output_path = apply_dawn_option(tpl_path, request_type, msg_type, cycle)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse({
        "success": True,
        "result_file": output_path
    }) 