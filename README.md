# AlexaItteq

## Build and deploy

```
yarn run build
sam deploy --stack-name alexa-itteq --capabilities CAPABILITY_IAM --parameter-overrides "Region=リージョン Bucket=発話テキストのバケット Key=発話テキストのキー"
```
