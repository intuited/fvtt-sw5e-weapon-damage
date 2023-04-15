const MODULE_ID = 'sw5e-weapon-damage';
const MODULE_ABBREV = 'SW5EWD';
const WEAPON_DAMAGE_TEMPLATE = `modules/${MODULE_ID}/templates/weapon-damage.hbs`;
const FORM_FIELDS_TEMPLATE = `modules/${MODULE_ID}/templates/form-fields.hbs`;

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(MODULE_ID);
});
const devModeActive = () => game.modules.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID);
function log(...args) {
    try {
        // if(game.modules.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID)) {
        if (devModeActive()) {
            console.log(MODULE_ID, '|', ...args);
        }
    } catch (e) {}
}
function logForce(...args) {
    console.log(MODULE_ID, '|', ...args);
}

function findFormFields(actor, item) {
    return $(`#ActorSheet5eCharacter-Actor-${actor.id} [data-item-id='${item.id}'] .item-name.rollable .form-group .form-fields`);
}
function findRollable(actor, item) {
    return $(`#ActorSheet5eCharacter-Actor-${actor.id} [data-item-id='${item.id}'] .item-name.rollable`);
}

/**
 * A weapon has max HP equal to the average roll of its damage dice.
 */
function weaponMaxHP(weapon) {
    log('weaponMaxHP: this, weapon', this, weapon);

    const damageFormula = weapon.system?.damage?.parts[0][0]; //admittedly does seem rather sus
    // The above is also located in `weapon.labels` but `system` seems more appropriate
    if (damageFormula === undefined) {
        ui.notifications.warn(`${MODULE_ID}: damage formula not found for weapon ${weapon?.name}`);
        return 0;
    }

    const match = damageFormula.match(/(\d+)d(\d+)/);
    if (!match) {
        ui.notifications.warn(`${MODULE_ID}: failed to match damage formula against` +
                              `"${damageFormula}" for weapon ${weapon?.name}`);
        return 0;
    }

    const [_, n, d] = match;
    return Math.ceil( (n + n*d) / 2 );
}

Handlebars.registerHelper("itemCurrentHP", function(options) {
    const item = this;
    log('itemCurrentHP helper: this, options', this, options);
    let currentHP = item.getFlag(MODULE_ID, 'currentHP');
    if (currentHP === undefined) {
        let currentHP = weaponMaxHP(item);
        item.setFlag(MODULE_ID, 'currentHP', currentHP);
    }
    return currentHP;
});
Handlebars.registerHelper("itemMaxHP", function (options) {
    const item = this;
    return weaponMaxHP(item);
});
/**
 * Nest the weapon damage template inside the form fields template.
 */
Handlebars.registerHelper("weaponDamage", async function (options) {
    return await renderTemplate(WEAPON_DAMAGE_TEMPLATE, this);
});

Hooks.on('renderedSwaltSheet', async (app, html, {actor: actor, items: items}) => {
    log('renderedSwaltSheet hook: this, app, html, actor, items', this, app, html, actor, items);
    // Get an Actor5e object for the actor we're working with
    actor = game.collections.get('Actor').get(actor._id);
    for (let item of actor.items.filter(i => i.type === 'weapon')) {
        log('    weapon:', item);
        const formFields = findFormFields(actor, item);
        if (formFields.length) {
            // Weapons which use ammunition already have a form-fields div that we append to
            formFields.append(await renderTemplate(WEAPON_DAMAGE_TEMPLATE, item));
        } else {
            // For other weapons, we create that same structure
            const rollable = findRollable(actor, item);
            log('    form-fields div not found.  actor, item:');
            const renderedWeaponDamage = await renderTemplate(WEAPON_DAMAGE_TEMPLATE, item);
            rollable.append(await renderTemplate(FORM_FIELDS_TEMPLATE, renderedWeaponDamage));
        }
    }
});
