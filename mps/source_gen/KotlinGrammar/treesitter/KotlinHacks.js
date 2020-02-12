module.exports = grammar({
  name: "KotlinHacks",
  extras: $ => [],
  rules: {
    EOF: $ => token(/[\r\n]/),

    QUOTE_CLOSE: $ => token("\""),

    TRIPLE_QUOTE_CLOSE: $ => token("\"\"\""),

    UNICODE_CLASS_ND: $ => token(/[0-9]/),

    UNICODE_CLASS_LL: $ => token(/[A-Za-z]/),

    UNICODE_CLASS_LM: $ => token("#####################LM"),

    UNICODE_CLASS_LO: $ => token("#####################LO"),

    UNICODE_CLASS_LT: $ => token("#####################LT"),

    UNICODE_CLASS_LU: $ => token("#####################LU"),

    UNICODE_CLASS_NL: $ => token("#####################NL"),

    MultiLineStringQuote: $ => token("#####################1"),

    LineStrText: $ => token("#####################2"),

    LineStrEscapedChar: $ => token("#####################3"),

    LineStrRef: $ => token("#####################4"),

    LineStrExprStart: $ => token("#####################5"),

    MultiLineStrText: $ => token("#####################6"),

    MultiLineStrRef: $ => token("#####################7"),

    MultiLineStrExprStart: $ => token("#####################8"),

    }
});