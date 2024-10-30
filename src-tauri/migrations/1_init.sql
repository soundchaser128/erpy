CREATE TABLE
    characters (
        id INTEGER PRIMARY KEY,
        uuid VARCHAR NOT NULL,
        "url" VARCHAR,
        payload VARCHAR NOT NULL,
        created_at VARCHAR NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at VARCHAR NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    chats (
        id INTEGER PRIMARY KEY,
        title VARCHAR,
        character_id INTEGER NOT NULL REFERENCES characters (id),
        payload VARCHAR NOT NULL,
        uuid VARCHAR NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at VARCHAR NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at VARCHAR NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    config (id INTEGER PRIMARY KEY, payload VARCHAR NOT NULL);