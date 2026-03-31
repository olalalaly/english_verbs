# English Verbs Trainer

Статический тренажер для изучения неправильных английских глаголов.

## Что есть

- карточки `EN` и `RU -> EN`
- практика `RU -> 3 формы` и `Формы -> RU`
- озвучка через браузерный `speechSynthesis`
- рейтинг и статус `Выучено / Не выучено`
- автодеплой на GitHub Pages через GitHub Actions

## Деплой

После пуша в ветку `main` workflow из `.github/workflows/deploy.yml` публикует сайт в GitHub Pages.

Если Pages еще не включен в репозитории, в GitHub нужно один раз открыть:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`
