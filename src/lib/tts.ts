import WavPlayer from "./wavplayer";

export function speak(apiUrl: string, text: string, speaker: string, language: string) {
  const player = WavPlayer();
  const url = new URL(`${apiUrl}/tts_stream`);
  url.searchParams.append("text", text);
  url.searchParams.append("speaker_wav", speaker);
  url.searchParams.append("language", language);
  const finished = player.play(url.toString());

  return {
    stop: player.stop,
    finished,
  };
}
