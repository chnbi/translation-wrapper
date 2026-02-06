/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add sourceLanguage and targetLanguages to projects collection
 * This enables per-project language configuration.
 */
migrate((app) => {
    const collection = app.findCollectionByNameOrId("projects");

    // Add sourceLanguage field (defaults to 'en')
    collection.fields.push({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_source_language",
        "max": 10,
        "min": 2,
        "name": "sourceLanguage",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
    });

    // Add targetLanguages JSON array field
    collection.fields.push({
        "hidden": false,
        "id": "json_target_languages",
        "maxSize": 0,
        "name": "targetLanguages",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
    });

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("projects");

    collection.fields = collection.fields.filter(f =>
        !["sourceLanguage", "targetLanguages"].includes(f.name)
    );

    return app.save(collection);
});
