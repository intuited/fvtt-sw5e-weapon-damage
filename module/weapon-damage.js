const MODULE_ID = 'sw5e-weapon-damage';
const MODULE_ABBREV = 'SW5EWD';
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/weapon-damage.hbs`;

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

function findParentDiv(actor, item) {
    return $(`#ActorSheet5eCharacter-Actor-${actor.id} [data-item-id='${item.id}'] .item-name.rollable`)
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

Hooks.on('renderedSwaltSheet', async (app, html, {actor: actor, items: items}) => {
    log('renderedSwaltSheet hook: this, app, html, actor, items', this, app, html, actor, items);
    // Get an Actor
    actor = game.collections.get('Actor').get(actor._id);
    for (let item of actor.items.filter(i => i.type === 'weapon')) {
        log('    weapon:', item);
        // for some reason we need to cast this object to the right class
        findParentDiv(actor, item).append(await renderTemplate(TEMPLATE_PATH, item));
    }
});
