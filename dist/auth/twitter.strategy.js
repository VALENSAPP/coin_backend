"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_twitter_1 = require("passport-twitter");
let TwitterStrategy = class TwitterStrategy extends (0, passport_1.PassportStrategy)(passport_twitter_1.Strategy, 'twitter') {
    constructor() {
        super({
            consumerKey: process.env.TWITTER_CONSUMER_KEY || 'TWITTER_CONSUMER_KEY',
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET || 'TWITTER_CONSUMER_SECRET',
            callbackURL: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback',
            includeEmail: true,
        });
    }
    async validate(token, tokenSecret, profile, done) {
        const { id, emails } = profile;
        const user = {
            twitterId: id,
            email: emails && emails[0]?.value,
            registrationType: 'TWITTER',
        };
        done(null, user);
    }
};
exports.TwitterStrategy = TwitterStrategy;
exports.TwitterStrategy = TwitterStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TwitterStrategy);
//# sourceMappingURL=twitter.strategy.js.map