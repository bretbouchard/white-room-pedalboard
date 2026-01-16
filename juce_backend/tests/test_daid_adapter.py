from audio_agent.daid_adapter import DAIDAdapter


class MockDAIDClient:
    def __init__(self):
        self.records = []

    def record(self, payload):
        self.records.append(payload)


def test_record_transformation_sends_payload():
    client = MockDAIDClient()
    adapter = DAIDAdapter(daid_client=client)

    payload = adapter.record_transformation(
        function_name="analyze_audio",
        inputs={"file": "sample.wav", "sample_rate": 44100},
        outputs={"duration": 3.5, "loudness": -12.3},
        metadata={"user_id": "tester"},
    )

    # Payload structure is returned
    assert payload["type"] == "transformation"
    assert payload["function"] == "analyze_audio"
    assert payload["inputs"]["file"] == "sample.wav"

    # And the mock client received the record
    assert len(client.records) == 1
    assert client.records[0]["function"] == "analyze_audio"
