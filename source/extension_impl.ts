import * as Base from 'base';
import * as Osd from 'osd';

const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const St = imports.gi.St;


export class FExtension extends Base.FExtensionBase {
    private MonitorsChangedId: number = 0;
    private OsdManager!: Osd.IOsdSkinner;

    constructor() {
        super();
    }

    Enable(): void {
        // Initialize the reskin manager for OSD
        this.OsdManager = new Osd.OsdSkinner();

        // Theme OSD windows that already exist, and listen for
        // future changes.
        this.MonitorsChangedId = Main.layoutManager.connect('monitors-changed', this.HandleMonitorsChanged.bind(this));
        this.HandleMonitorsChanged();
    }

    Disable(): void {
        Main.layoutManager.disconnect(this.MonitorsChangedId);
    }

    HandleMonitorsChanged(): void {
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0.1, () => {
            this.SkinOsdWindows();
            return true;
        });
    }

    SkinOsdWindows(): void {
        const owm = Main.osdWindowManager;

        for (let index = 0; index < Main.layoutManager.monitors.length; index++) {
            const osdWindow = owm._osdWindows[index];

            // Skip if the object has been already reskinned
            if (osdWindow.__reskinned) {
                this.OsdManager.relayoutActor(osdWindow);
                continue;
            }
            osdWindow.__reskinned = true;

            // Actor has not been skinned before. Do it now.
            this.OsdManager.reskinActor(osdWindow);

            // Disconnect existing scale changed callbacks
            // @ts-ignore
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            if (osdWindow._scaleChangedId) {
                themeContext.disconnect(osdWindow._scaleChangedId);
            }

            // Connect our relayout callback to scale change signal.
            const callback = this.OsdManager.relayoutActor.bind(this.OsdManager, osdWindow);
            osdWindow._scaleChangedId = themeContext.connect('notify::scale-factor', callback);
            osdWindow._relayout = callback;
            callback();
        }
    }
}