import * as Base from 'base';
import * as GNOME from 'gnome';

const Main = imports.ui.main;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const St = imports.gi.St;
const GLib = imports.gi.GLib;


var OsdWindowConstraint = GObject.registerClass(
    class OsdWindowConstraint extends Clutter.Constraint {
        _minHeight = 0;
        _minWidth = 0;

        _init(props: any) {
            this._minWidth = 0;
            this._minHeight = 0;
            super._init(props);
        }

        // Kept for compatibility with GNOME's
        set minSize(v: number) {
            print('-------------');
            this._minWidth = v;
            this._minHeight = v;
            if (this.actor)
                this.actor.queue_relayout();
        }

        // Extended setters
        set minWidth(v: number) {
            print('-------------');
            this._minWidth = v;
            if (this.actor)
                this.actor.queue_relayout();
            print('width', v);
        }

        set minHeight(v: number) {
            print('-------------');
            this._minHeight = v;
            if (this.actor)
                this.actor.queue_relayout();
            print('height', v);
        }

        vfunc_update_allocation(actor: any, actorBox: any) {
            print('------------- VFUNC UP ALLOC');
            // Clutter will adjust the allocation for margins,
            // so add it to our minimum size
            let minWidth = this._minWidth + actor.margin_top + actor.margin_bottom;
            let minHeight = this._minHeight + actor.margin_top + actor.margin_bottom;
            let [width, height] = actorBox.get_size();

            // Enforce a ratio of 1
            let size_x = Math.ceil(Math.max(minWidth, width));
            let size_y = Math.ceil(Math.max(minHeight, height));
            actorBox.set_size(size_x, size_y);

            // Recenter
            let [x, y] = actorBox.get_origin();
            actorBox.set_origin(Math.ceil(x + width / 2 - size_x / 2), Math.ceil(y + height / 2 - size_y / 2));
        }
    });


class FExtensionOSD extends Base.FExtensionBase {
    Platform: GNOME.FPlatformGnome
    MonitorsChangedId: number = 0

    constructor() {
        super();

        this.Platform = new GNOME.FPlatformGnome();
    }

    enable(): void {
        //InjectUtils.Inject(Main.osdWindowManager, '_monitorsChanged', this.HandleMonitorsChanged);
        this.MonitorsChangedId = Main.layoutManager.connect('monitors-changed', this.HandleMonitorsChanged.bind(this));
        this.HandleMonitorsChanged();

    }

    disable(): void {
        Main.layoutManager.disconnect(this.MonitorsChangedId);
    }

    HandleMonitorsChanged(): void {
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0.1, () => {
            this.SkinOSDWindows();
        });
    }

    SkinOSDWindows(): void {
        const OWM = Main.osdWindowManager;

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const OSDWindow = OWM._osdWindows[i];

            if (OSDWindow.__reskinned) {
                this._relayout(OSDWindow);
                continue;
            }
            OSDWindow.__reskinned = true;

            // Relayout
            OSDWindow.remove_child(OSDWindow._box);
            let GridLayout = new Clutter.GridLayout();
            let NewBox = new St.Widget({
                layout_manager: GridLayout,
                style_class: 'osd-window'
            });
            let NewConstraint = new OsdWindowConstraint();
            NewBox.add_constraint(NewConstraint);
            OSDWindow.add_actor(NewBox);

            GridLayout.set_column_spacing(8);

            // Expand the level bar
            OSDWindow._level.set_x_expand(true);
            OSDWindow._level.set_y_expand(true);

            // Align label to left
            OSDWindow._label.set_x_expand(true);
            OSDWindow._label.set_x_align(1);

            // Reparentize children
            OSDWindow._box.remove_child(OSDWindow._icon);
            OSDWindow._box.remove_child(OSDWindow._label);
            OSDWindow._box.remove_child(OSDWindow._level);
            GridLayout.attach(OSDWindow._icon, 0, 0, 1, 2);
            GridLayout.attach(OSDWindow._label, 1, 0, 1, 1);
            GridLayout.attach(OSDWindow._level, 1, 1, 1, 1);

            // Destroy old box
            OSDWindow._box.destroy();
            OSDWindow._box = NewBox;
            OSDWindow._boxConstraint = NewConstraint;
            OSDWindow._gridlayout = GridLayout;

            // Hijack scale changed event
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            if (OSDWindow._scaleChangedId) {
                themeContext.disconnect(OSDWindow._scaleChangedId);
            }
            OSDWindow._scaleChangedId = themeContext.connect('notify::scale-factor', this._relayout.bind(this, OSDWindow));
            OSDWindow._relayout = this._relayout.bind(this, OSDWindow);
            this._relayout(OSDWindow);
        }
    }

    _relayout(OsdWindow: any) {
        print('-------------');
        /* assume 110x110 on a 640x480 display and scale from there */
        let monitor = Main.layoutManager.monitors[OsdWindow._monitorIndex];
        if (!monitor)
            return; // we are about to be removed

        let scalew = monitor.width / 640.0;
        let scaleh = monitor.height / 480.0;
        let popupSizeX = 110 * Math.max(1, scalew);
        let popupSizeY = 12 * Math.max(1, scaleh);

        let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        OsdWindow._icon.icon_size = Math.min(popupSizeX, popupSizeY);// / (2 * scaleFactor);
        OsdWindow._box.translation_y = Math.round(monitor.height / 4);
        print('Scale:', scalew, scaleh, scaleFactor,
            ', Sizes:', popupSizeX, popupSizeY);
        OsdWindow._boxConstraint.minWidth = popupSizeX;
        OsdWindow._boxConstraint.minHeight = popupSizeY;
    }

    GetPlatform(): GNOME.FPlatformGnome { return this.Platform; }
}

let ExtObject: FExtensionOSD;

export function init() {
    ExtObject = new FExtensionOSD();
}

export function enable() {
    ExtObject.enable();
}

export function disable() {
    ExtObject.disable();
}

export function GetGExt(): FExtensionOSD {
    return ExtObject;
}