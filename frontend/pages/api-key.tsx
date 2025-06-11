import React, { useState, useEffect } from "react";
import axios from "axios";
import Head from "next/head";
import Card from "../components/Card";
import Alert from "../components/Alert";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../components/AuthContext";

const ApiKeyPage: React.FC = () => {
  const { isAuthenticated, login, logout, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [alert, setAlert] = useState<{type: 'success'|'danger'|'info'|'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publicApiStatus, setPublicApiStatus] = useState<{hasKey: boolean, isWorking: boolean} | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadApiKey();
    } else {
      // 로그인하지 않은 상태에서도 API 키 상태 확인
      checkPublicApiStatus();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!password) {
      setLoginError("비밀번호를 입력해주세요.");
      return;
    }

    const success = await login(password);
    if (!success) {
      setLoginError("비밀번호가 올바르지 않습니다.");
    }
    setPassword("");
  };

  const handleLogout = async () => {
    if (confirm('정말로 로그아웃하시겠습니까?')) {
      await logout();
      setAlert({
        type: 'info',
        message: '로그아웃되었습니다.'
      });
    }
  };

  const checkPublicApiStatus = async () => {
    try {
      const response = await axios.get("/api/api-key/status");
      setPublicApiStatus({
        hasKey: response.data.hasKey || false,
        isWorking: response.data.isWorking || false
      });
    } catch (error: any) {
      setPublicApiStatus({
        hasKey: false,
        isWorking: false
      });
    }
  };

  const loadApiKey = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/api-key/");
      if (response.data.masked) {
        setMaskedKey(response.data.masked);
      }
    } catch (error: any) {
      setAlert({
        type: 'danger',
        message: 'API 키 조회 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setAlert({
        type: 'warning',
        message: 'API 키를 입력해주세요.'
      });
      return;
    }

    try {
      setIsLoading(true);
      setAlert(null);
      
      const response = await axios.put("/api/api-key/", {
        new_key: apiKey.trim()
      });
      
      if (response.data.success) {
        setAlert({
          type: 'success',
          message: 'API 키가 성공적으로 저장되었습니다.'
        });
        setApiKey("");
        await loadApiKey();
      }
    } catch (error: any) {
      setAlert({
        type: 'danger',
        message: 'API 키 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('정말로 API 키를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setIsLoading(true);
      setAlert(null);
      
      await axios.delete("/api/api-key/kakao");
      
      setAlert({
        type: 'success',
        message: 'API 키가 성공적으로 삭제되었습니다.'
      });
      setMaskedKey("");
    } catch (error: any) {
      setAlert({
        type: 'danger',
        message: 'API 키 삭제 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="api-key-page">
        <div className="max-w-md mx-auto mt-8">
          <Card title="🔐 관리자 로그인">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="관리자 비밀번호를 입력하세요"
                  autoFocus
                />
              </div>
              
              {loginError && (
                <Alert
                  type="danger"
                  message={loginError}
                  onClose={() => setLoginError("")}
                />
              )}
              
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={authLoading}
              >
                {authLoading ? "로그인 중..." : "로그인"}
              </button>
            </form>
          </Card>
          
          <div className="mt-4 space-y-4">
            {/* API 키 상태 표시 */}
            <Card title="🔑 API 키 상태">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-light rounded">
                  <div>
                    <div className="font-medium">카카오 API 키</div>
                    <div className="text-sm text-gray">주소 검색 기능</div>
                  </div>
                  <div className="text-right">
                    {publicApiStatus === null ? (
                      <div className="text-gray">
                        <span className="animate-pulse">⏳</span> 확인 중...
                      </div>
                    ) : publicApiStatus.hasKey ? (
                      <div>
                        <div className="text-green-600 font-medium">
                          ✅ API 키 설정됨
                        </div>
                        <div className={`text-sm ${publicApiStatus.isWorking ? 'text-green-600' : 'text-red-600'}`}>
                          {publicApiStatus.isWorking ? '🟢 정상 작동' : '🔴 연결 오류'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600 font-medium">
                        ❌ API 키 미설정
                      </div>
                    )}
                  </div>
                </div>
                
                {publicApiStatus && !publicApiStatus.hasKey && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-sm text-yellow-800">
                      ⚠️ API 키가 설정되지 않았습니다.<br/>
                      관리자 로그인 후 카카오 API 키를 설정해주세요.
                    </div>
                  </div>
                )}
                
                {publicApiStatus && publicApiStatus.hasKey && !publicApiStatus.isWorking && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-sm text-red-800">
                      🚨 API 키는 설정되어 있지만 연결에 문제가 있습니다.<br/>
                      관리자 로그인 후 API 키를 확인해주세요.
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            <Card title="📋 접근 안내">
              <p className="text-sm text-gray">
                API 키 관리는 관리자만 접근할 수 있습니다.<br/>
                관리자 비밀번호를 입력하여 로그인해주세요.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>API 키 관리 - 허우적 배송분류 시스템</title>
        <meta name="description" content="카카오 REST API 키를 설정하여 주소 검색 기능을 활성화합니다. 관리자 전용 페이지입니다." />
        <meta name="keywords" content="API키관리, 카카오API, REST API, 주소검색, 관리자설정" />
        <meta property="og:title" content="API 키 관리 - 허우적 배송분류 시스템" />
        <meta property="og:description" content="카카오 REST API 키를 설정하여 주소 검색 기능을 활성화합니다." />
        <meta property="og:url" content="https://delivery.example.com/api-key" />
        <link rel="canonical" href="https://delivery.example.com/api-key" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="api-key-page">
        {/* 페이지 헤더 */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="icon-lg bg-primary text-white rounded-full flex items-center justify-center mr-3">
                  🔑
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-0">카카오 API 키 설정</h1>
                  <p className="text-gray mb-0">주소 검색 기능을 위한 카카오 개발자 플랫폼 REST API 키를 입력하세요.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray">
                  <span className="text-green-600">✅</span> 관리자 로그인됨
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                  title="관리자 로그아웃"
                >
                  🚪 로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
        
        <div className="grid gap-4">
          <div className="col-8">
            <Card title="🔑 API 키 관리">
              <div className="space-y-4">
                {maskedKey && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray mb-1">현재 설정된 API 키</div>
                          <div className="font-mono text-primary font-medium">{maskedKey}</div>
                        </div>
                        <div className="text-green-600">
                          ✅ 연결됨
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="api-key" className="block text-sm font-medium mb-2">
                    새 API 키 입력
                  </label>
                  <input
                    type="password"
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="form-input"
                    placeholder="카카오 개발자 플랫폼에서 발급받은 REST API 키를 입력하세요"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? "저장 중..." : "API 키 저장"}
                  </button>
                  
                  {maskedKey && (
                    <button
                      className="btn btn-danger"
                      onClick={handleClear}
                      disabled={isLoading}
                    >
                      {isLoading ? "삭제 중..." : "API 키 삭제"}
                    </button>
                  )}
                </div>
                
                {isLoading && (
                  <div className="flex justify-center mt-4">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          <div className="col-4">
            <div className="space-y-4">
              {/* API 정보 카드 */}
              <Card title="📋 API 키 정보">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-primary mb-2">카카오 API란?</h4>
                    <p className="text-sm text-gray leading-relaxed">
                      카카오 개발자 플랫폼에서 제공하는 주소 검색 API입니다. 
                      정확한 주소 정보를 통해 우편번호 매칭 정확도를 높입니다.
                    </p>
                  </div>
                </div>
              </Card>

              {/* 발급 가이드 카드 */}
              <Card title="🚀 API 키 발급 가이드">
                <div className="space-y-3">
                  <ol className="text-sm text-gray space-y-2">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">1</span>
                      <div>
                        <a href="https://developers.kakao.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          카카오 개발자 사이트
                        </a> 접속
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">2</span>
                      <span>내 애플리케이션 → 앱 만들기</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">3</span>
                      <span>플랫폼 설정 → Web 추가</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">4</span>
                      <span>제품 설정 → 카카오 로그인 활성화</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">5</span>
                      <span>앱 키 → REST API 키 복사</span>
                    </li>
                  </ol>
                </div>
              </Card>

              {/* 보안 정보 카드 */}
              <Card title="🔒 보안 주의사항">
                <div className="space-y-3">
                  <ul className="text-sm text-gray space-y-2">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>API 키는 암호화되어 저장됩니다</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">⚠</span>
                      <span>외부 노출을 금지해주세요</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">🔄</span>
                      <span>주기적으로 키를 갱신하세요</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApiKeyPage; 