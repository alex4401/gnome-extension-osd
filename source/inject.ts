// Originally written by https://github.com/maoschanz

const _injections: any[string] = [];

export function Inject(Parent: any, Name: string, Func: Function): Function {
    let Origin = Parent[Name];
    Parent[Name] = function () {
        let Ret;
        Ret = Origin.apply(this, arguments);
        if (Ret === undefined) {
            Ret = Func.apply(this, arguments);
        }
        return Ret;
    }
    return Origin;
}

export function Revert(Object: any, Name: string) {
    if (_injections[Name] === undefined) {
        delete Object[Name];
    }
    else {
        Object[Name] = _injections[Name];
    }
}
