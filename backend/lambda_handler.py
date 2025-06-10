from mangum import Mangum
from main import app
import os

# Lambda 환경에서는 데이터 디렉토리를 /tmp로 설정
if os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    os.environ['DATA_DIR'] = '/tmp'

handler = Mangum(app) 