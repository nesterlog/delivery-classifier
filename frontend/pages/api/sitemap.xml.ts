import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 캐시 헤더 설정
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.setHeader('Content-Type', 'application/xml');

  // 현재 날짜
  const currentDate = new Date().toISOString().split('T')[0];

  // 사이트맵 XML 생성
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 메인 페이지 -->
  <url>
    <loc>https://delivery.example.com/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- 배송 분류 페이지 (메인 기능) -->
  <url>
    <loc>https://delivery.example.com/classify</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- 데이터 관리 페이지 -->
  <url>
    <loc>https://delivery.example.com/data-management</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 우편번호 관리 페이지 -->
  <url>
    <loc>https://delivery.example.com/zipcode</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 송장 매칭 페이지 -->
  <url>
    <loc>https://delivery.example.com/invoice</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- 새벽 옵션 추가 페이지 -->
  <url>
    <loc>https://delivery.example.com/dawn-option</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

  res.status(200).send(sitemap);
} 