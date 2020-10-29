const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const St = imports.gi.St;

export var OsdWindowConstraint = GObject.registerClass(
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
            this._minWidth = v;
            this._minHeight = v;

            if (this.actor) {
                this.actor.queue_relayout();
            }
        }

        // Extended setters
        set minWidth(v: number) {
            this._minWidth = v;

            if (this.actor) {
                this.actor.queue_relayout();
            }
        }

        set minHeight(v: number) {
            this._minHeight = v;

            if (this.actor) {
                this.actor.queue_relayout();
            }
        }

        vfunc_update_allocation(actor: any, actorBox: any) {
            // Clutter will adjust the allocation for margins,
            // so add it to our minimum size
            const minWidth = this._minWidth + actor.margin_top + actor.margin_bottom;
            const minHeight = this._minHeight + actor.margin_top + actor.margin_bottom;
            const [width, height] = actorBox.get_size();

            // Enforce a ratio of 1
            const size_x = Math.ceil(Math.max(minWidth, width));
            const size_y = Math.ceil(Math.max(minHeight, height));
            actorBox.set_size(size_x, size_y);

            // Recenter
            const [x, y] = actorBox.get_origin();
            actorBox.set_origin(Math.ceil(x + width / 2 - size_x / 2), Math.ceil(y + height / 2 - size_y / 2));
        }
    }
);


export interface IOsdSkinner {
    reskinActor(osdWindow: any): void;
    relayoutActor(osdWindow: any): void;
}


export class OsdSkinner implements IOsdSkinner {
    public reskinActor(osdWindow: any): void {
        const icon = osdWindow._icon;
        const levelBar = osdWindow._level;
        const label = osdWindow._label;

        // Relayout
        osdWindow.remove_child(osdWindow._box);
        const gridLayout = new Clutter.GridLayout();
        const newBox = new St.Widget({
            layout_manager: gridLayout,
            style_class: 'osd-window'
        });
        // @ts-ignore
        const NewConstraint = new OsdWindowConstraint();
        newBox.add_constraint(NewConstraint);
        osdWindow.add_actor(newBox);

        gridLayout.set_column_spacing(8);

        // Expand the level bar
        levelBar.set_x_expand(true);
        levelBar.set_y_expand(true);

        // Align label to left
        label.set_x_expand(true);
        label.set_x_align(1);

        // Reparentize children
        osdWindow._box.remove_child(icon);
        osdWindow._box.remove_child(label);
        osdWindow._box.remove_child(levelBar);
        gridLayout.attach(icon, 0, 0, 1, 2);
        gridLayout.attach(label, 1, 0, 1, 1);
        gridLayout.attach(levelBar, 1, 1, 1, 1);

        // Destroy old box
        osdWindow._box.destroy();
        osdWindow._box = newBox;
        osdWindow._boxConstraint = NewConstraint;
        osdWindow._gridlayout = gridLayout;
    }

    public relayoutActor(osdWindow: any): void {
        /* assume 110x110 on a 640x480 display and scale from there */
        // @ts-ignore
        const monitor = Main.layoutManager.monitors[osdWindow._monitorIndex];
        if (!monitor) {
            return; // about to be removed
        }

        const scalew = monitor.width / 640.0;
        const scaleh = monitor.height / 480.0;
        const popupSizeX = 110 * Math.max(1, scalew);
        const popupSizeY = 12 * Math.max(1, scaleh);

        //let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        osdWindow._icon.icon_size = Math.min(popupSizeX, popupSizeY);// / (2 * scaleFactor);
        osdWindow._box.translation_y = Math.round(monitor.height / 4);
        osdWindow._boxConstraint.minWidth = popupSizeX;
        osdWindow._boxConstraint.minHeight = popupSizeY;
    }
}