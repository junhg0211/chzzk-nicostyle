import requests


def main():
    req = requests.get(
        "https://chzzk.naver.com/account-interlock",
        data={"clientId": "", "redirectUri": "", "state": ""},
    )
    print(req.text)


if __name__ == "__main__":
    main()
