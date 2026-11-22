# Playful Booth Idea

행사에서 모인 한 줄을, 모두가 보는 아이디어 보드로 보여줍니다.

Google Form 응답이 저장되는 Google Sheet를 연결하면 새 답변이 게시판에 도착합니다. 행사명·질문·아이콘을 설정하고, 우주형 말풍선과 카드형 메모 중 원하는 화면을 선택할 수 있습니다.

**처음이라면 샘플로 화면을 확인한 뒤, 본인 Google 계정으로 실제 시트를 연결해주세요.**

- [사용자 QA 가이드: 샘플부터 실제 Google 연동까지](https://github.com/yeseul-garden/playful-booth-idea/blob/main/docs/QA.md)
- [Apps Script 연결 코드](integrations/google-apps-script/Code.gs) · [Bridge.html](integrations/google-apps-script/Bridge.html)
- 로컬 실행 후 [스크린샷을 포함한 연결 튜토리얼](http://localhost:4173/setup.html)

## 로컬에서 시작하기

Node.js 20 이상과 npm이 필요합니다.

```sh
git clone https://github.com/yeseul-garden/playful-booth-idea.git
cd playful-booth-idea
npm ci
npm run build
npm run dev
```

[http://localhost:4173](http://localhost:4173)을 열고 **보드 만들기**를 누릅니다. 행사명과 질문을 입력하고 화면·손을 고른 뒤 **샘플로 미리보기**를 누르세요. Google 계정 연결 없이도 사용할 수 있습니다.

미리보기의 **샘플 응답 도착시키기** 버튼으로 새 응답 연출을 확인할 수 있습니다. 처음부터 보이는 샘플 카드에는 도착 효과가 실행되지 않습니다.

## 어떤 화면인가요?

| 화면 | 기존 답변 | 새 답변이 도착하면 |
| --- | --- | --- |
| 우주형 | 별빛과 행성 위에 말풍선이 떠 있습니다. | 말풍선이 중앙에서 커졌다가 게시판에 합류합니다. |
| 카드형 | 코르크 보드 위에 종이 메모가 놓입니다. | 선택한 사람·고양이·강아지 손이 잠깐 카드를 붙이고 사라집니다. |

상단에서 화면을 바꿔도 응답과 연결은 유지됩니다. 긴 답변은 카드를 눌러 전체 내용을 볼 수 있습니다. 운영체제의 동작 줄이기 설정을 사용하면 움직임을 줄이고 손 연출을 생략합니다.

## 본인 Google Sheet 연결하기

실제 Google 계정의 권한 승인·Apps Script 배포·폼 제출은 사용자가 직접 진행합니다. 이 저장소에는 기본으로 연결된 시트나 Google 계정이 없습니다.

1. Google Form의 **응답** 탭에서 응답 시트를 준비합니다.
2. 제출 시각·답변·작성자 정보가 들어 있는 열 문자를 확인합니다.
3. 새 Apps Script 프로젝트에 `Code.gs`와 `Bridge.html`을 붙여넣습니다.
4. **프로젝트 설정 → 스크립트 속성**에 아래 값을 저장합니다.
5. `readBoothIdeas`를 실행하고 계정과 요청 권한을 확인합니다.
6. 웹 앱을 배포한 뒤 발급된 **`/exec` URL**을 게시판 설정에 입력합니다.
7. 본인 폼으로 테스트 답변을 제출하고 시트와 게시판에서 확인합니다.

자세한 입력 위치, 권한 화면, 예상 결과는 [실제 연동 QA 순서](https://github.com/yeseul-garden/playful-booth-idea/blob/main/docs/QA.md#실제-google-formsheetapps-script-연동)를 따라가세요. 로컬 튜토리얼의 화면 예시는 기본으로 접혀 있으며, 이미지를 클릭해 확대할 수 있습니다. 예시의 개인 정보는 가렸습니다.

| 스크립트 속성 | 입력할 값 |
| --- | --- |
| `SHEET_ID` | 본인 시트 URL의 `/d/` 뒤부터 다음 `/` 앞까지 |
| `TAB_NAME` | 응답 탭 이름. 파일 제목과 구분하며 띄어쓰기도 일치해야 합니다. |
| `TIMESTAMP_COLUMN` | 제출 시각의 열 문자. 기본 `A` |
| `MESSAGE_COLUMN` | 답변 본문의 열 문자. 기본 `B` |
| `AUTHOR_COLUMN` | 작성자 이름의 열 문자. 기본 `C` |
| `ALLOWED_ORIGINS` | 게시판의 출처. 예: `https://your-name.github.io` |

기존 시트가 A/E/F 구성이라면 그대로 지정하면 됩니다. 세 항목에는 서로 다른 열을 사용합니다. [기본 A/B/C CSV 예시](public/response-template.csv)도 제공합니다.

## 데이터와 접근 범위

Apps Script는 지정한 세 열을 각각 읽고, 선택하지 않은 중간 열은 가져오지 않습니다. 코드에는 시트를 수정하거나 답변을 쓰는 동작이 없습니다. Google 승인 화면에는 코드의 동작보다 넓은 Sheets 권한이 표시될 수 있으므로 실제 요청 범위를 확인해주세요.

- 답변이 빈 행은 제외하고 작성자가 비어 있으면 익명으로 표시합니다.
- 같은 작성자가 여러 답변을 제출해도 각각 카드로 표시합니다.
- 참여자 수는 대소문자를 구분하지 않은 작성자 식별값의 개수에 익명 응답 수를 더합니다. 실제 인원을 인증하는 기능은 아닙니다.
- 현재 화면에는 치즈케이크 총 200개에서 참여자 수를 뺀 잔여 수량이 표시됩니다. 실제 수령·재고 관리 기능은 없습니다.
- 행사명·질문·아이콘·화면·손·연결 주소는 해당 브라우저에 저장됩니다. 다른 기기와 자동 동기화하지 않으며, 응답 데이터는 영구 저장하지 않습니다.

원본 시트를 웹에 게시할 필요는 없습니다. 다만 웹 앱을 **나 / 모든 사용자**로 배포하면 시트 접근 권한이 없는 방문자도 선택한 답변과 작성자 값을 조회할 수 있습니다. `ALLOWED_ORIGINS`와 창 사이 메시지 검증은 사용자 로그인·서버 측 권한 확인을 대신하지 않습니다. 연결 URL은 브라우저에서 확인할 수 있는 값입니다.

시트 ID·탭 이름은 Google의 스크립트 속성에 입력하고, 비밀번호·토큰·실제 응답은 공개 저장소에 올리지 마세요. Workspace에서 익명 배포를 제한하면 관리자에게 확인합니다.

## 현장에서 조작하기

| 조작 | 동작 |
| --- | --- |
| 우주형 뷰 / 카드형 뷰 | 화면 전환 |
| 설정으로 돌아가기 | 행사 정보·화면·손 설정 |
| 카드 클릭 / Esc | 전체 답변 열기 / 닫기 |
| ← / → | 페이지 이동 |
| Space / 일시정지 버튼 | 모션과 자동 페이지 순환 정지·재개 |
| F / 전체 화면 버튼 | 전체 화면 전환 |
| 새로고침 버튼 | 실제 응답 즉시 확인 |
| 하단 톱니바퀴 | 연결 설정 |

첫 연결에서는 기존 응답을 표시하고, 이후 새 응답에 도착 효과를 실행합니다. 기본 확인 간격은 요청 완료 후 7초, 서버 캐시는 5초, 자동 페이지 전환은 18초입니다. 백그라운드 탭에서는 요청을 멈추고 복귀할 때 확인합니다. 연결 실패 시 마지막 정상 응답을 유지하며 재시도합니다. 접수 시간 제한은 없으며 Google Form에서 수집을 관리합니다.

아이콘은 PNG·JPG·WebP, 최대 5MB를 지원합니다. 업로드한 이미지는 긴 쪽 최대 256px의 PNG로 변환해 브라우저에 저장합니다.

## GitHub Pages에서 사용하기

이 저장소 업로드만으로 Pages가 자동 배포되지는 않습니다. 정적 배포 파일은 다음 명령으로 만듭니다.

```sh
npm ci
npm run build
```

`dist/` 안의 파일이 정적 호스팅 대상입니다. `dist/`는 생성 결과라 Git 추적에서 제외합니다. GitHub Pages를 설정할 때 빌드 결과물을 Pages 아티팩트로 배포하세요.

게시판이 `https://yeseul-garden.github.io/playful-booth-idea/`에 배포되었다면 `ALLOWED_ORIGINS`에는 **`https://yeseul-garden.github.io`**만 입력합니다. 저장소 경로와 끝 슬래시는 제외합니다. 이 주소는 배포 예시이며 현재 공개 사이트가 있다는 의미는 아닙니다. 맞춤 도메인이 있으면 실제 게시판 도메인을 사용하세요.

Pages는 정적 파일을 제공하고 Google 데이터 읽기는 Apps Script가 담당합니다. 같은 `github.io` 호스트 아래 프로젝트는 경로가 달라도 같은 출처입니다. [GitHub Pages 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Apps Script 웹 앱 권한](https://developers.google.com/apps-script/guides/web)을 참고하세요.

## 개발 검증

```sh
npm test
npm run build
npm run test:browser
```

단위 테스트는 데이터 처리·열 접근 범위·연결 브리지·레이아웃 계산 등을 검사합니다. 브라우저 검사는 개발 의존성인 `puppeteer-core`와 설치된 Chrome을 사용하며 별도 테스트 프로필로 실행됩니다.

```sh
CHROME_PATH="/path/to/chrome" npm run test:browser
```

`BOOTH_URL`로 테스트 주소, `BOOTH_SHOTS`로 결과 폴더를 지정할 수 있습니다. 기본 결과 폴더는 Git에서 제외한 `test-results/`입니다. 자동 검사는 실제 Google 권한 승인과 데이터 연동을 대신하지 않습니다. 행사 전에는 [사용자 QA 체크리스트](https://github.com/yeseul-garden/playful-booth-idea/blob/main/docs/QA.md)를 완료해주세요.

## 폴더 구성

```text
public/                         웹 앱·연결 튜토리얼·이미지
integrations/google-apps-script/ Google Apps Script 원본
scripts/                        빌드·브라우저 검사
server.mjs                      로컬 미리보기 서버
tests/                          단위 테스트
docs/QA.md                      사용자 직접 연동·화면 QA
```

## 디자인 및 크레딧

Booth buddy 로고·디자인 토큰과 Space Grotesk 폰트는 `public/brand/`에 보관합니다. 폰트 라이선스는 함께 포함한 OFL을 확인해주세요. 카드 자동 배정에는 블루·그린·옐로·핑크·크림을 사용합니다.

[Taste Skill](https://github.com/Leonxlnx/taste-skill)과 [Hallmark](https://github.com/Nutlope/hallmark)의 MIT 디자인 지침, Damir Sokolovsky의 [Unslop](https://github.com/heydamir/unslop) 지침([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))을 앱에 맞게 수정·적용했습니다. [디자인 검토 기록](docs/design-review.md)과 [튜토리얼 이미지 편집 기록](docs/tutorial-images.md)을 함께 제공합니다.
