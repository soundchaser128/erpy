import WavPlayer from "./wavplayer";

export function speak(text: string, speaker: string, language: string) {
  const player = WavPlayer();
  const url = new URL("http://localhost:8020/tts_stream");
  url.searchParams.append("text", text);
  url.searchParams.append("speaker_wav", speaker);
  url.searchParams.append("language", language);
  player.play(url.toString());

  return player.stop;
}
