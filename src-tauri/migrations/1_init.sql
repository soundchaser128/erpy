CREATE TABLE
    characters (
        id INTEGER PRIMARY KEY,
        url VARCHAR,
        payload VARCHAR NOT NULL
    );

CREATE TABLE
    chats (
        id INTEGER PRIMARY KEY,
        title VARCHAR,
        character_id INTEGER NOT NULL REFERENCES characters (id),
        payload VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uuid VARCHAR NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
    );

CREATE TABLE
    config (id INTEGER PRIMARY KEY, payload VARCHAR NOT NULL);