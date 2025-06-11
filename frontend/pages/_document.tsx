import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="ko">
        <Head>
          {/* 기본 메타 태그 */}
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          
          {/* SEO 메타 태그 */}
          <meta name="description" content="허우적 배송분류 자동화 시스템 - 당일배송, 새벽배송, 택배배송을 자동으로 분류하고 주소 매칭을 통해 배송 효율성을 높이는 전문 솔루션입니다." />
          <meta name="keywords" content="배송분류, 자동화, 당일배송, 새벽배송, 택배배송, 주소매칭, 우편번호, 배송관리, 물류시스템, 허우적" />
          <meta name="author" content="허우적 배송분류 자동화 시스템" />
          <meta name="robots" content="index, follow" />
          <meta name="theme-color" content="#007bff" />
          
          {/* Open Graph 메타 태그 */}
          <meta property="og:title" content="허우적 배송분류 자동화 시스템" />
          <meta property="og:description" content="당일배송, 새벽배송, 택배배송을 자동으로 분류하고 주소 매칭을 통해 배송 효율성을 높이는 전문 솔루션" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://delivery.example.com" />
          <meta property="og:image" content="/logo.png" />
          <meta property="og:locale" content="ko_KR" />
          <meta property="og:site_name" content="허우적 배송분류 자동화 시스템" />
          
          {/* Twitter Card 메타 태그 */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="허우적 배송분류 자동화 시스템" />
          <meta name="twitter:description" content="당일배송, 새벽배송, 택배배송을 자동으로 분류하고 주소 매칭을 통해 배송 효율성을 높이는 전문 솔루션" />
          <meta name="twitter:image" content="/logo.png" />
          
          {/* 구조화된 데이터 (JSON-LD) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "허우적 배송분류 자동화 시스템",
                "description": "당일배송, 새벽배송, 택배배송을 자동으로 분류하고 주소 매칭을 통해 배송 효율성을 높이는 전문 솔루션",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web Browser",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "KRW"
                },
                "author": {
                  "@type": "Organization",
                  "name": "허우적"
                }
              })
            }}
          />
          
          {/* 파비콘 */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/site.webmanifest" />
          
          {/* 폰트 */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
          
          {/* 캐시 제어 */}
          <meta httpEquiv="Cache-Control" content="public, max-age=31536000" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 