'use strict'
import * as  Discord from 'passport-discord';
import * as passport from 'passport';
import { Express } from 'express';
import { AuthConfig, AuthDelegate } from 'google-auth-wrapper';
type SerializationHandler = (err?: Error, id?: string) => any;
type AuthenticateHandler = (err?: Error, user?: any) => any;

export class DiscordAuth {
    private app: Express;
    private config: AuthConfig;
    private delegate: AuthDelegate;

    constructor(app: Express, config: AuthConfig, delegate: AuthDelegate) {
        this.app = app;
        this.config = config;
        this.delegate = delegate;

        passport.serializeUser((u, d) => this.serializeUser(u, d));
        passport.deserializeUser((u, d) => this.deserializeUser(u, d));
        passport.use('discord', new Discord.Strategy({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            callbackURL: config.authCallback,
            scope: config.scope,
        }, this.authenticate));


        app.use(passport.initialize());
        app.use(passport.session());
        app.get(config.authRoute, passport.authenticate('discord', { scope: config.scope }));
        app.get(config.authCallback, passport.authenticate('discord'));

        app.get(config.logoutRoute, (req: Express.Request, res: Express.Response &
        { redirect: (logoutRedirect: string) => any }) => {
            (req as Express.Request & { logout: () => any }).logout();
            res.redirect(config.logoutRedirect);
        });
    }

    private authenticate(accessToken: string, refreshToken: string, profile: any, done: AuthenticateHandler) {
        process.nextTick(() => {
            return done(null, profile);
        });
    }

    private deserializeUser(id: any, done: SerializationHandler) {
        this.delegate.deserialize(id).then((o: any) => {
            done(null, o.providerId);
        }).catch((err: Error) => {
            done(err, null);
        });
    }

    private serializeUser(user: any, done: SerializationHandler) {
        this.delegate.serialize(user).then((u: any) => {
            done(null, u.providerId);
        }).catch(console.log);
    }


    private isAuthenticated(req: Express.Request & { isAuthenticated: () => boolean }, res: Express.Response) {
        return req.isAuthenticated();
    }

    private ensureAuthenticated(req: Express.Request & { isAuthenticated: () => boolean },
        res: Express.Response & { sendStatus: (code: number) => any }, next: () => any) {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.sendStatus(403);
        }
    }

}