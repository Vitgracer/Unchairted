import { BubbleHunterGame } from './bubble_hunter.js';
import { EggCatcherGame } from './egg_catcher.js';
import { GravityDeniedGame } from './gravity_denied.js';

export const gamesRegistry = [
    new BubbleHunterGame(),
    new EggCatcherGame(),
    new GravityDeniedGame(),
    {
        id: 'SECRET',
        name: 'SECRET MODE',
        icon: '🔒',
        locked: true,
        comingSoon: true,
        rules: [
            'Probably GTA 6?',
            'No. 😊',
            'KEEP MOVING TO UNLOCK'
        ],
        tutorial: null,
        statsKeys: []
    }
];

export function getGameById(id) {
    return gamesRegistry.find(game => game.id === id);
}
