CREATE TABLE "character" (
    id INTEGER PRIMARY KEY,
    "url" VARCHAR,
    payload JSONB NOT NULL
);

CREATE TABLE chat (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    remote_id INTEGER NOT NULL,
    title VARCHAR,
    character_id INTEGER NOT NULL REFERENCES "character" (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL  
);
