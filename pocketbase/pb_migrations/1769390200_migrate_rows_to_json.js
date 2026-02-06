/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("pbc_1686272191") // project_rows

    // 1. Add fields if they don't exist
    // We check by name to avoid error if re-running
    if (!collection.fields.getByName("translations")) {
        collection.fields.add(new Field({
            "hidden": false,
            "id": "json_translations",
            "name": "translations",
            "type": "json",
            "system": false,
            "required": false,
            "presentable": false,
            "maxSize": 0
        }))
    }

    if (!collection.fields.getByName("source_text")) {
        collection.fields.add(new Field({
            "hidden": false,
            "id": "text_source_text",
            "name": "source_text",
            "type": "text",
            "system": false,
            "required": false,
            "presentable": false,
            "autogeneratePattern": "",
            "max": 0,
            "min": 0,
            "pattern": ""
        }))
    }

    app.save(collection)

    // 2. Data Migration: Copy 'en', 'my', 'zh' to new structure
    // We do this in a transaction-like way, looping all records
    try {
        const records = app.findAllRecords("project_rows")

        for (const record of records) {
            let changed = false

            // Migrate EN -> source_text
            const en = record.get("en")
            const currentSource = record.get("source_text")
            if (en && !currentSource) {
                record.set("source_text", en)
                changed = true
            }

            // Migrate MY/ZH -> translations JSON
            const my = record.get("my")
            const zh = record.get("zh")
            let translations = record.get("translations") || {}

            // Convert from PocketBase/Go map if needed, although usually it works as object in JS context
            // But to be safe in migration context:
            if (typeof translations !== 'object') translations = {}

            const rowStatus = record.get("status") // 'approved', 'draft', etc.
            // We map row status to language status for legacy compatibility
            const langStatus = rowStatus === 'approved' ? 'approved' : 'draft'

            if (my && !translations.my) {
                translations.my = { text: my, status: langStatus, remark: "" }
                changed = true
            }
            if (zh && !translations.zh) {
                translations.zh = { text: zh, status: langStatus, remark: "" }
                changed = true
            }

            if (changed) {
                record.set("translations", translations)
                app.save(record)
            }
        }
    } catch (e) {
        console.log("Migration warning (data update): " + e.message)
        // We don't fail the schema migration if data update fails, to ensure schema is at least up
    }

}, (app) => {
    // We generally don't revert schema additions to avoid data loss on dev
    // But strictly speaking we would remove the fields here.
})
