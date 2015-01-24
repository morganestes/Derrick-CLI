var path = require('path'),
		NPromise = require('promise'),
		spawn = require('child_process').spawn;

module.exports = {

	Resource: Resource,

	VcsResource: VcsResource

};

function checkProp(obj, prop, type) {
	"use strict";
	var exists = true,
			wrongType = false;
	try {
		if (undefined === obj[prop]) {
			exists = false;
		} else if (type && type !== typeof obj[prop]) {
			wrongType = typeof obj[prop];
		}
	} catch (e) {
		exists = false;
	}
	if (!exists) {
		throw new Error(prop + ' is a required field!');
	}
	if (wrongType) {
		throw new Error(prop + ' must be a ' + type + '. Was a ' + wrongType + ' instead.');
	}
}

function Resource(info) {
	"use strict";
	if (!info.location) {
		info.location = '{name}';
	}
	checkProp(info, 'type', 'string');
	checkProp(info, 'name', 'string');
	this.type = info.type;
	this.name = info.name;
	this.location = path.normalize(info.location.replace('{name}', this.name));
	this.path = path.join(this.type, this.location);
}

Resource.prototype.path = '';
Resource.prototype.name = '';
Resource.prototype.type = '';
Resource.prototype.location = '';
Resource.prototype.install = function (where) {
	"use strict";
	console.log(where);
};

function VcsResource(info) {
	"use strict";
	if (this.constructor === VcsResource) {
		throw new Error('This is an abstract class!');
	}
	checkProp(info, 'url', 'string');
	if (!info.vcs || 'svn' !== info.vcs) {
		info.vcs = 'git';
	}
	if (!info.name) {
		info.name = path.basename(info.url, '.' + info.vcs);
	}
	this.url = info.url;
	this.vcs = info.vcs;
	this.ref = info.ref || '';
	Resource.call(this, info);
}

VcsResource.prototype = Object.create(Resource.prototype);
VcsResource.prototype.constructor = VcsResource;
VcsResource.prototype.url = '';
VcsResource.prototype.vcs = '';
VcsResource.prototype.ref = '';
VcsResource.prototype.install = function (where) {
	"use strict";
};
VcsResource.newFromVcs = function (info) {
	"use strict";
	var resource;
	info.vcs = info.vcs || 'git';
	switch (info.vcs) {
		case 'git':
			resource = new GitResource(info);
			break;
		case 'svn':
			resource = new SvnResource(info);
			break;
		default:
			throw new Error('invalid vcs type!');
	}
	return resource;
};

function GitResource(info) {
	"use strict";
	info.ref = info.ref || 'master';
	VcsResource.call(this, info);
}

GitResource.prototype = Object.create(VcsResource.prototype);
GitResource.prototype.constructor = GitResource;
GitResource.prototype.install = function (where) {
	"use strict";
	var that = this;
	return new NPromise(function (resolve, reject) {
		var clone = spawn('git', ['clone', '-q', that.url, where], {stdio: 'inherit'});
		clone.on('error', reject);
		clone.on('close', function (code) {
			if (code > 0) {
				reject('Git exited with non-zero code!');
			} else {
				resolve(true);
			}
		});
	});
};

function SvnResource(info) {
	"use strict";
	info.ref = undefined === info.ref ? 'trunk' : info.ref;
	VcsResource.call(this, info);
}

SvnResource.prototype = Object.create(VcsResource.prototype);
SvnResource.prototype.constructor = SvnResource;
SvnResource.prototype.install = function (where) {
	"use strict";
	var that = this;
	return new NPromise(function (resolve, reject) {
		var checkout = spawn('svn', ['checkout', '-q', that.url, where], {stdio: 'inherit'});
		checkout.on('error', reject);
		checkout.on('close', function (code) {
			if (code > 0) {
				reject('SVN exited with non-zero code!');
			} else {
				resolve(true);
			}
		});
	});
};
