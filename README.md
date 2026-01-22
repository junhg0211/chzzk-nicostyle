# Chzzk-Nicostyle

Chzzk-Nicostyle은 치지직 채팅을 니코니코 동화 스타일로 화면에 나타나도록 해주는 프로그램입니다.

## 설치 방법

1. [GitHub 저장소 릴리즈](https://github.com/junhg0211/chzzk-nicostyle/releases)에서 최신 버전을 다운로드합니다.
2. 실행합니다.

## 사용 방법

1. 프로그램을 실행하면 `localhost:3000`에서 웹 서버가 시작됩니다.
2. `http://localhost:3000`에 접속하여 채널 채팅 API 서비스 연결에 동의합니다.
3. OBS 등의 방송 소프트웨어에서 브라우저 소스를 추가하고 URL을 `http://localhost:3000/app`으로 설정합니다.
4. 채팅이 니코니코 동화 스타일로 표시되는 것을 확인합니다.

## 설정

`.cloud`에 대한 스타일을 수정하여 채팅의 글씨체, 크기, 색상 등을 변경할 수 있습니다.

```
.cloud {
    font-family: 'SUIT', sans-serif;  /* 글씨체 */
    font-size: 24px;                  /* 글씨 크기 */
    color: #FFFFFF;                   /* 글씨 색상 */
    text-shadow: 0 0 10px #000000;    /* 글씨에 그림자 효과 추가 */

    /* 등등, CSS 문법을 활용하여 다양한 스타일을 적용할 수 있습니다. */
}
```

## 빌드 방법

```
bun add -d javascript-obfuscator
bunx javascript-obfuscator server.js env.js --compact true --control-flow-flattening true --dead-code-injection true --debug-protection true --disable-console-output true --self-defending true --string-array true --string-array-encoding rc4 --string-array-threshold 1 --unicode-escape-sequence true -o server.obf.js
bun build server.obf.js --compile --windows-icon res/icon.ico
```

## 기여 방법

1. 저장소를 포크합니다.
2. 새로운 브랜치를 만듭니다.
3. 변경 사항을 커밋합니다.
4. 푸시합니다.
5. 풀 리퀘스트를 생성합니다.
