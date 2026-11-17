# Memory Aid

A memory aid for seniors. It records a conversation, works out who said what, and lets the person ask about it later in plain language.

I built it to help older people remember conversations, like what the doctor said at an appointment or what a family member asked them to do.

## What it does

You record a conversation in the browser. The app sends the audio off to be transcribed, and the transcript comes back split by speaker with a short summary. You tell it how many people were talking and match each voice to a person. People you add are saved, so the next time you just pick them from a list.

After that you can ask about it. Type a question such as "what did my daughter say about Sunday?" and the answer comes from your saved conversations. There is also a history page where you can read old conversations segment by segment.

It handles medications too. Take or upload a photo of a prescription and the app reads the medication, dose and schedule from it. You can fix the list by hand and create calendar reminders for each dose.

For people who would rather talk than type, you can enter a phone number and the assistant calls it.

Everyone signs in with their own account, so one person's conversations and medications stay separate from another's.

## How it works

This repo is the frontend: React, TypeScript, Vite, Tailwind and shadcn/ui, with Firebase for sign-in. It is also set up as an Android app through Capacitor (app name "Chatter Memory").

The frontend calls a separate backend over HTTP for transcription, search and the rest:

| Endpoint | Used for |
|---|---|
| `/transcribe` | speech to text, split by speaker, plus a summary |
| `/save-conversation` | storing a conversation once speakers are named |
| `/rag-query` | answering questions from saved conversations |
| `/list-all-vectors` | conversation history |
| `/medication-calendar` | reading a prescription and building reminders |
| `/initiate-vapi-call` | starting a phone call |

The backend is not in this repo, and the address in the code points at a development server that is no longer running. The app builds and the interface loads, but recording, chat and medications need a backend that serves those endpoints.

## Run it

```sh
git clone https://github.com/LuciPengu/memory-aid
cd memory-aid
npm install
npm run dev
```

`npm run build` makes a production build in `dist/`.

## What I would do next

The first thing is to put the backend in the open next to this repo and read its address from an environment variable.

The recording screen needs bigger text and fewer steps. The people this is for should not need a tutorial.

I would also like a family member or carer to be able to see the account, with the senior's permission.

## License

MIT
