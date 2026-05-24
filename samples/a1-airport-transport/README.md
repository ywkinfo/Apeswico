# A1 Airport Transport Sample - Migration Guide & Status

본 디렉토리는 Spanish Lab 맞춤 스페인어 학습 서비스 베타 운영을 위한 A1 입문 레벨 샘플 콘텐츠("공항에서 시내까지 이동" 시나리오)를 보관하는 공간입니다. 

이 초안은 추후 B1-B2 포트폴리오 사이트인 **Apeswico** 레포지토리로 이전하여 실제 퍼블리싱을 진행할 예정입니다.

---

## 1. Apeswico 레포지토리 이전 가이드 (Migration Guide)

본 샘플 문서를 Apeswico 레포지토리로 이전할 때 다음 가이드를 준수합니다.

1. **대상 폴더 경로**
   - Apeswico 레포지토리의 `/samples/a1-airport-transport/` 경로 하위로 본 파일(`README.md`)과 원본 콘텐츠(`airport-transport.md`)를 복사하여 배치합니다.
2. **인덱스(Index) 및 네비게이션 연동**
   - Apeswico 포트폴리오의 메인 인덱스 파일(예: `index.html` 또는 관련 페이지 컴포넌트)에 A1 수준의 맞춤 서비스 예시로 접근 가능한 카드나 링크 영역을 생성합니다.
   - 링크 경로는 해당 레포지토리의 정적 페이지 빌드 규칙에 맞춰 `/samples/a1-airport-transport/` 하위 파일로 연결합니다.
3. **스타일 및 뷰어 템플릿**
   - 이 문서의 콘텐츠(`airport-transport.md`)가 Apeswico 사이트의 뷰어 컴포넌트를 통해 다른 중급 콘텐츠와 일관된 디자인 레이아웃(배너, 카드, 퀴즈 블록 등)으로 렌더링되도록 템플릿 설정을 구성합니다.

---

## 2. 검수 상태 기록 (Review Status)

사용자 신뢰도를 높이기 위해 교차 검수 완료 여부와 실제 원어민 감수 단계를 명확히 분리하여 표시합니다.

## Review Status

- Source/dictionary cross-check: completed   # 사전·예문 확인 (초안 단계)
- Human Spanish review: pending              # 원어민 검수 대기
- Reviewer / Date: (사람 검수 완료 후에만 채움)

> [!WARNING]
> 원어민 혹은 전문가가 직접 본문에 수록된 모든 스페인어 표현을 육안으로 검수하여 승인하기 전까지는 **Human Spanish review** 항목을 절대 `completed`로 수정하지 마십시오. 또한 `Reviewer / Date`에 어떠한 사람 정보나 검수 일자도 기재하지 마십시오.
