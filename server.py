import json

import flask
import dotenv
import urllib
import os

dotenv.load_dotenv()


app = flask.Flask(__name__)


@app.route("/auth/callback")
def get_auth_callback():
    data = flask.request.args
    code = data.get("code")
    state = data.get("state")

    with open("auth_data.json", "w") as file:
        json.dump({"code": code, "state": state}, file)

    return "Authentication data saved."


@app.route("/")
def get_index():
    clientId = urllib.parse.quote_plus(os.getenv("CLIENT_ID"))
    redirectUri = urllib.parse.quote_plus(os.getenv("REDIRECT_URI"))
    return flask.redirect(
        f"https://chzzk.naver.com/account-interlock?clientId={clientId}&redirectUri={redirectUri}&state=0"
    )


if __name__ == "__main__":
    app.run(host="", port=3000)
