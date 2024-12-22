use anyhow::Result;
use reqwest::Client;
use reqwest::Url;

pub struct Xtts2Client {
    base_url: Url,
    client: Client,
}

impl Xtts2Client {
    pub fn new(url: &str) -> Result<Self> {
        Ok(Self {
            base_url: url.parse()?,
            client: Client::new(),
        })
    }

    pub async fn speak(
        &self,
        text: &str,
        speaker: &str,
        language: &str,
        channel: tauri::ipc::Channel<&[u8]>,
    ) -> Result<()> {
        let mut url = self.base_url.clone();
        url.set_path("/tts_stream");

        url.query_pairs_mut()
            .append_pair("text", text)
            .append_pair("speaker_wav", speaker)
            .append_pair("language", language);

        let mut response = self.client.get(url).send().await?.error_for_status()?;
        while let Some(bytes) = response.chunk().await? {
            channel.send(&bytes)?;
        }

        Ok(())
    }
}
