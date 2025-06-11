import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(__file__))

# backend 모듈을 import
from backend.main import app

# Elastic Beanstalk이 찾을 수 있도록 application 변수로 export
application = app

if __name__ == "__main__":
    application.run(debug=True) 