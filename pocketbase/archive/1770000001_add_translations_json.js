/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add translations JSON field and source_language to project_rows
 * This replaces hardcoded language columns (en, my, zh) with a dynamic structure.
 * 
 * New Schema:
 * - source_text: The original text (replaces 'en' column)
 * - translations: JSON object { "my": { "text": "...", "status": "review" }, "zh": { ... } }
 * - source_language: Language code of the source (default: "en")
 */
migrate((app) => {
    const collection = app.findCollectionByNameOrId("project_rows");

    // Add source_text field
    collection.fields.push({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_source_text",
        "max": 0,
        "min": 0,
        "name": "source_text",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
    });

    // Add translations JSON field
    collection.fields.push({
        "hidden": false,
        "id": "json_translations",
        "maxSize": 0,
        "name": "translations",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
    });

    // Add source_language field
    collection.fields.push({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_source_language",
        "max": 10,
        "min": 2,
        "name": "source_language",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
    });

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("project_rows");

    // Remove fields on rollback
    collection.fields = collection.fields.filter(f =>
        !["source_text", "translations", "source_language"].includes(f.name)
    );

    return app.save(collection);
});
