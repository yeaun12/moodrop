# 한 장 스튜디오

브라우저에서 이미지·문구를 편집해 PNG/JPEG로 내보내는 정적 웹 편집기입니다.

## 실행

index.html, style.css, core.js, app.js, CardSans.otf를 같은 폴더에 두고 정적 호스팅으로 배포합니다. 서버·API 키·로그인은 필요하지 않습니다. 템플릿은 접속한 도메인의 브라우저 localStorage에 저장됩니다. 시크릿 창 종료나 브라우저 데이터 삭제 시 사라질 수 있으므로 JSON으로 백업하세요.

## 기능

- PNG/JPEG 업로드, 이미지 확대·위치·어둡기
- 문구, 크기, 색, 위치, 정렬, 자동 줄바꿈·축소
- 1:1 / 4:5 / 9:16, 동일 canvas의 PNG/JPEG 출력
- 사용자 템플릿 최대 30개 생성·불러오기·수정·삭제
- JSON 전체 검증 후 일괄 저장, 잘못된 입력 시 기존 내용 유지
- 저장 한도 4MB. 이미지는 최대 변 1600px로 축소하고 원본 메타데이터를 제거

## 소스

core.js: 렌더링·줄바꿈·스키마 검증
app.js: 화면 이벤트·템플릿·파일 처리
style.css: 반응형 UI

## 이미지 및 글꼴

example-1.png, example-2.png, example-3.png는 이번 작업에서 코드로 제작한 추상 배경과 문구입니다. 외부 사진은 사용하지 않았습니다. 제작 방식은 AI 보조 코드 제작이며, 학생이 직접 그린 이미지로 표시하지 않습니다.

CardSans.otf: Noto Sans CJK KR Bold의 한글·라틴 문자 서브셋.
원본: https://github.com/notofonts/noto-cjk/tree/main/Sans
허가: SIL Open Font License 1.1 (FONT-LICENSE.txt)

소스 zip에는 로그인 정보·원본 과제 HTML·사용자 업로드 파일을 포함하지 않습니다.
