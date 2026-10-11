import os
from pathlib import Path
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
import json

BASE = Path(__file__).parent.parent
out_dir = BASE / "audio"
out_dir.mkdir(parents=True,exist_ok=True)


load_dotenv(BASE/".env")

api_key=os.getenv("ELEVEN_API_KEY")
voice_id = os.getenv("VOICE_ID")


client = ElevenLabs(
    api_key=api_key
)

json_file  = BASE/"data"/"scenarios.json"

with json_file.open("r",encoding="utf-8") as file:
    content = json.load(file)

voice_ids = {}

for scenario in content["scenarios"]:
    character = scenario["name"]
    voice_id = scenario["voice"]["voiceId"]
    voice_ids[character] = voice_id


opening_dialogues = {}

for scenario in content["scenarios"]:
    character = scenario["name"]
    topic = scenario["topic"]
    line = scenario["open"]

    if character not in opening_dialogues:
        opening_dialogues[character] = {}


    if topic not in opening_dialogues[character]:
        opening_dialogues[character][topic] = scenario["open"]



character_responses = {}

for scenario in content["scenarios"]:
    character = scenario["name"]
    topic = scenario["topic"]

    if character not in character_responses:
        character_responses[character] = {}
    if topic not in character_responses[character]:
        character_responses[character][topic] = {}

    for reply_group in scenario["replies"]:
        for reply in reply_group:
            parent_response = reply["text"]

            child_lines = content["childResponses"].get(parent_response)

            if child_lines:
                character_responses[character][topic][parent_response] = " ".join(child_lines)


repair_reactions = {}

for character in voice_ids:
    repair_reactions[character] = {}

    for repairChoice in content["repairChoices"]:
        parent_response = repairChoice["text"]

        child_lines = content["childResponses"].get(parent_response)

        if child_lines:
            repair_reactions[character][parent_response] = " ".join(child_lines)



fallback_lines = {
    "harmful": "I’m worried I shouldn’t have said anything. Can we slow down?",
    "promise": "What if we need someone else to help?",
    "neutral": "I’m not sure how to explain it. I need you to listen.",
    "shutdown": "I don’t want to talk about it anymore.",
}

fallback_reactions = {}

for character in voice_ids:
    fallback_reactions[character] = fallback_lines.copy()



later_dialogues = {}

for scenario in content["scenarios"]:
    character = scenario["name"]
    topic = scenario["topic"]
    if character not in later_dialogues:
        later_dialogues[character] = {}
    if topic not in later_dialogues[character]:
        later_dialogues[character][topic] = []


    
    for later_dialogue in scenario["later"]:
        later_dialogues[character][topic].append(later_dialogue) 
    

# ElevenLabs generation -- everything above this block is your existing code.
import argparse
import hashlib
import re
import unicodedata

generated_audio_dir = BASE.resolve() / "assets" / "audio"
audio_jobs = []
seen_dialogues = set()


def filename_slug(value):
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "dialogue"


def add_audio_job(character, label, text):
    # The same sentence needs a separate recording for each character's voice.
    if (character, text) in seen_dialogues:
        return

    # Your response dictionaries join sentences together. Recover the individual
    # sentences so each one receives its own tags from scenarios.json.
    sentences = [text]
    for child_lines in content["childResponses"].values():
        if " ".join(child_lines) == text:
            sentences = child_lines
            break

    tagged_sentences = []
    for sentence in sentences:
        tags = content.get("audioTags", {}).get(sentence, [])
        tag_prefix = " ".join(f"[{tag}]" for tag in tags)
        tagged_sentences.append(f"{tag_prefix} {sentence}".strip())

    if not voice_ids.get(character):
        raise ValueError(f"Missing voice ID for {character}")

    audio_jobs.append({
        "character": character,
        "label": label,
        "text": text,
        "tagged_text": " ".join(tagged_sentences),
        "voice_id": voice_ids[character],
    })
    seen_dialogues.add((character, text))


# Read the dictionaries you already collected, without changing them.
for character, topics in opening_dialogues.items():
    for topic, text in topics.items():
        add_audio_job(character, f"{topic}-opening", text)

for character, topics in character_responses.items():
    for topic, responses in topics.items():
        for index, text in enumerate(responses.values(), start=1):
            add_audio_job(character, f"{topic}-response-{index}", text)

for character, responses in repair_reactions.items():
    for index, text in enumerate(responses.values(), start=1):
        add_audio_job(character, f"repair-{index}", text)

for character, responses in fallback_reactions.items():
    for kind, text in responses.items():
        add_audio_job(character, f"fallback-{kind}", text)

for character, topics in later_dialogues.items():
    for topic, sentences in topics.items():
        for index, text in enumerate(sentences, start=1):
            add_audio_job(character, f"{topic}-later-{index}", text)


def generate_audio(dry_run=False, limit=None, model_id="eleven_v4"):
    jobs = audio_jobs if limit is None else audio_jobs[:limit]
    print(f"{len(audio_jobs)} unique recordings collected; processing {len(jobs)}.")

    if dry_run:
        for job in jobs:
            print(f"{job['character']} | {job['label']} | {job['tagged_text']}")
        print("Dry run: no API calls made.")
        return

    if not api_key:
        raise ValueError("ELEVEN_API_KEY is missing from your project .env file")

    generated_audio_dir.mkdir(parents=True, exist_ok=True)
    manifest_file = generated_audio_dir / "recordings.json"
    recordings = (
        json.loads(manifest_file.read_text(encoding="utf-8"))
        if manifest_file.exists() else {}
    )

    for job in jobs:
        # Changing the voice, tags, text or model creates a new filename.
        signature = json.dumps(
            [job["voice_id"], model_id, job["tagged_text"], "mp3_44100_128"],
            ensure_ascii=False,
        )
        digest = hashlib.sha256(signature.encode("utf-8")).hexdigest()[:16]
        character_dir = generated_audio_dir / filename_slug(job["character"])
        character_dir.mkdir(parents=True, exist_ok=True)
        output_file = character_dir / f"{filename_slug(job['label'])}-{digest}.mp3"

        if output_file.exists() and output_file.stat().st_size > 0:
            print(f"Already saved: {output_file.name}")
        else:
            print(f"Generating: {job['character']} / {job['label']}")
            audio_chunks = client.text_to_speech.convert(
                voice_id=job["voice_id"],
                text=job["tagged_text"],
                model_id=model_id,
                output_format="mp3_44100_128",
            )
            audio_bytes = b"".join(chunk for chunk in audio_chunks if chunk)
            if not audio_bytes:
                raise RuntimeError(f"No audio returned for {job['label']}")
            temporary_file = output_file.with_suffix(".mp3.part")
            temporary_file.write_bytes(audio_bytes)
            temporary_file.replace(output_file)

        # Match the clean displayed dialogue to its saved recording later.
        recordings.setdefault(job["character"], {})[job["text"]] = (
            output_file.relative_to(BASE.resolve()).as_posix()
        )
        temporary_manifest = manifest_file.with_suffix(".json.part")
        temporary_manifest.write_text(
            json.dumps(recordings, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        temporary_manifest.replace(manifest_file)

    print(f"Recordings saved in {generated_audio_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate the collected child voices")
    parser.add_argument("--dry-run", action="store_true", help="Preview without API calls")
    parser.add_argument("--limit", type=int, help="Process only the first N recordings")
    parser.add_argument("--model", default="eleven_v4", help="ElevenLabs model ID")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    generate_audio(dry_run=args.dry_run, limit=args.limit, model_id=args.model)

